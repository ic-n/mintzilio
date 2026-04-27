import {
    create,
    fetchCollection,
    type CollectionV1,
} from '@metaplex-foundation/mpl-core';
import {
    transferTokens,
    findAssociatedTokenPda,
} from '@metaplex-foundation/mpl-toolbox';
import {
    generateSigner,
    publicKey,
    createNoopSigner,
    type Umi,
    type PublicKey,
    type Transaction,
    type Signer,
} from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import type { MintConfig } from './config.js';

export interface MintResult {
    transaction: Uint8Array;
    assetAddress: string;
}

export interface MintState {
    totalMinted: number;
    isActive: boolean;
}

export class NftMinter {
    private umi: Umi;
    private config: MintConfig;
    private state: MintState;

    private collectionAddress: PublicKey;
    private splMint: PublicKey;
    private treasuryAta: PublicKey;

    constructor(umi: Umi, config: MintConfig) {
        this.umi = umi;
        this.config = config;
        this.state = { totalMinted: 0, isActive: true };

        this.collectionAddress = publicKey(config.collectionAddress);
        this.splMint = publicKey(config.splMint);
        this.treasuryAta = publicKey(config.treasuryAddress);
    }

    /** Sync supply counter from on-chain collection data */
    async syncSupply(): Promise<void> {
        const { fetchAssetsByCollection } =
            await import('@metaplex-foundation/mpl-core');
        const assets = await fetchAssetsByCollection(
            this.umi,
            this.collectionAddress
        );
        this.state.totalMinted = assets.length;
    }

    getStatus(): {
        totalMinted: number;
        maxSupply: number;
        isActive: boolean;
        price: string;
    } {
        return {
            totalMinted: this.state.totalMinted,
            maxSupply: this.config.maxSupply,
            isActive: this.state.isActive,
            price: this.config.price.toString(),
        };
    }

    setActive(active: boolean): void {
        this.state.isActive = active;
    }

    /**
     * Build an atomic transaction: SPL token transfer + Core NFT create.
     *
     * The server partially signs (asset keypair). The user must co-sign
     * (authorizes SPL transfer + pays gas). Modifying the tx invalidates
     * the server's signature — no one can mint without paying.
     */
    async buildMintTransaction(payerAddress: string): Promise<MintResult> {
        if (!this.state.isActive) {
            throw new Error('Minting is paused');
        }
        if (this.state.totalMinted >= this.config.maxSupply) {
            throw new Error('Max supply reached');
        }

        const payer = createNoopSigner(publicKey(payerAddress));
        const asset = generateSigner(this.umi);

        // Derive payer's ATA for the SPL token
        const payerAta = findAssociatedTokenPda(this.umi, {
            mint: this.splMint,
            owner: publicKey(payerAddress),
        });

        // Fetch collection object (required by Core `create` helper)
        const collection = await fetchCollection(
            this.umi,
            this.collectionAddress
        );

        const nextId = this.state.totalMinted + 1;

        // Stub metadata URI — placeholder until real assets are generated
        const metadataUri = `https://arweave.net/placeholder/${nextId}.json`;

        // Build atomic tx: SPL transfer + Core create
        const tx = transferTokens(this.umi, {
            source: payerAta,
            destination: this.treasuryAta,
            amount: this.config.price,
            authority: payer,
        })
            .add(
                create(this.umi, {
                    asset,
                    collection,
                    name: `Ponzilio #${nextId}`,
                    uri: metadataUri,
                    owner: payer.publicKey,
                })
            )
            .setFeePayer(payer);

        // Build and partially sign (server signs with asset keypair;
        // Umi identity = collection authority signs the create ix)
        const built: Transaction = await tx.buildAndSign(this.umi);

        // Serialize for transport to client
        const serialized = this.umi.transactions.serialize(built);

        // Increment counter optimistically (will re-sync on startup)
        this.state.totalMinted = nextId;

        return {
            transaction: serialized,
            assetAddress: asset.publicKey.toString(),
        };
    }

    /**
     * Verify a submitted mint transaction confirmed on-chain.
     * Returns the signature if confirmed.
     */
    async verifyMint(
        signature: Uint8Array
    ): Promise<{ confirmed: boolean; signature: string }> {
        const result = await this.umi.rpc.confirmTransaction(signature, {
            strategy: {
                type: 'blockhash',
                ...(await this.umi.rpc.getLatestBlockhash()),
            },
        });
        const sigStr = base58.deserialize(signature)[0];
        return { confirmed: !result.value.err, signature: sigStr };
    }
}
