import {
  usePhantom,
  useModal,
  useSolana,
  useDisconnect,
} from "@phantom/react-sdk";
import { useCandyMachineState } from "./useCandyMachineState";
import { useMintNft } from "./useMintNft";
import { MINT_PRICE_DISPLAY } from "../../lib/solana/constants";

export function MintSection() {
  const { isConnected } = usePhantom();
  const { solana } = useSolana();
  const { open } = useModal();
  const { disconnect } = useDisconnect();
  const { state, loading: cmLoading, refetch } = useCandyMachineState();
  const { mint, status, result, error, reset } = useMintNft(refetch);

  const isMinting = status === "minting";
  const isSoldOut = state ? state.redeemed >= state.available : false;
  const mintDisabled = !isConnected || isMinting || isSoldOut;

  const short = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20">
      {/* Card */}
      <div
        className="w-full max-w-[440px] rounded-3xl p-8 flex flex-col gap-7"
        style={{
          background:
            "linear-gradient(160deg, rgba(12,12,26,0.92), rgba(18,18,42,0.88))",
          border: "1px solid rgba(192,192,216,0.12)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(192,192,216,0.06)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Badge */}
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-cyan-neon"
            style={{ boxShadow: "0 0 8px #00FFEE" }}
          />
          <span className="font-display text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-neon">
            Devnet Drop
          </span>
        </div>

        {/* Title */}
        <div>
          <h1
            className="font-display font-extrabold leading-[0.9] tracking-[-0.03em] mb-2"
            style={{ fontSize: "clamp(1.8rem, 6vw, 2.6rem)" }}
          >
            <span
              style={{
                background:
                  "linear-gradient(90deg, #C0C0D8 0%, #ffffff 40%, #C0C0D8 80%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Toxic Ponzilio
            </span>
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #00FFEE 0%, #00B8A0 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Boyfriends
            </span>
          </h1>
          <p className="text-chrome-dim/60 text-sm">
            Metaplex Core • 777 supply
          </p>
        </div>

        {/* Supply */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(192,192,216,0.04)",
            border: "1px solid rgba(192,192,216,0.08)",
          }}
        >
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-chrome-dim text-xs font-display font-bold tracking-widest uppercase">
              Supply
            </span>
            {cmLoading ? (
              <span className="text-chrome-dim/40 text-sm">Loading…</span>
            ) : state ? (
              <span className="font-display font-bold text-chrome">
                {state.redeemed}{" "}
                <span className="text-chrome-dim/50 font-normal">
                  / {state.available}
                </span>
              </span>
            ) : (
              <span className="text-chrome-dim/40 text-sm">—</span>
            )}
          </div>
          {!cmLoading && state && (
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(192,192,216,0.1)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(state.redeemed / state.available) * 100}%`,
                  background: isSoldOut
                    ? "linear-gradient(90deg,#FF00BB,#ff5f1f)"
                    : "linear-gradient(90deg,#00FFEE,#00B8A0)",
                  boxShadow: isSoldOut
                    ? "0 0 12px rgba(255,0,187,0.5)"
                    : "0 0 12px rgba(0,255,238,0.4)",
                }}
              />
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex justify-between items-center">
          <span className="text-chrome-dim text-xs font-display font-bold tracking-widest uppercase">
            Price
          </span>
          <span className="font-display font-bold text-lg text-chrome">
            {MINT_PRICE_DISPLAY}
          </span>
        </div>

        {/* Wallet row */}
        {isConnected && solana.publicKey ? (
          <div className="flex items-center justify-between">
            <span className="text-chrome-dim/60 text-xs font-mono">
              {short(solana.publicKey)}
            </span>
            <button
              onClick={() => disconnect()}
              className="text-[11px] font-display font-bold tracking-widest uppercase text-chrome-dim/50 hover:text-magenta-neon transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={open}
            className="w-full py-3.5 rounded-2xl font-display font-bold text-sm tracking-wide text-chrome transition-all duration-150 hover:-translate-y-0.5"
            style={{
              background:
                "linear-gradient(160deg,rgba(192,192,216,0.12),rgba(192,192,216,0.06))",
              border: "1px solid rgba(192,192,216,0.2)",
            }}
          >
            Connect Wallet
          </button>
        )}

        {/* Mint button */}
        {isConnected && !isSoldOut && status !== "success" && (
          <button
            onClick={mint}
            disabled={mintDisabled}
            className="w-full py-4 rounded-2xl font-display font-bold text-base relative overflow-hidden transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: mintDisabled
                ? "linear-gradient(180deg,#1a3a36,#0d2420)"
                : "linear-gradient(180deg,#00FFE5 0%,#00B8A0 55%,#007A6C 100%)",
              border: "1px solid rgba(0,255,238,0.45)",
              boxShadow: mintDisabled
                ? "none"
                : "0 0 32px rgba(0,255,238,0.3),0 1px 0 rgba(255,255,255,0.4) inset,0 -2px 0 rgba(0,0,0,0.2) inset",
              color: mintDisabled ? "rgba(0,255,238,0.4)" : "#001714",
            }}
          >
            {isMinting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Minting…
              </span>
            ) : (
              "Mint NFT"
            )}
            {!mintDisabled && (
              <span
                className="absolute inset-x-[3%] top-0 h-[52%] pointer-events-none rounded-t-2xl"
                style={{
                  background:
                    "linear-gradient(to bottom,rgba(255,255,255,0.38),rgba(255,255,255,0))",
                }}
              />
            )}
          </button>
        )}

        {/* Sold out */}
        {isSoldOut && (
          <div className="text-center font-display font-bold text-magenta-neon/80 tracking-widest text-sm uppercase">
            Sold Out
          </div>
        )}

        {/* Success */}
        {status === "success" && result && (
          <div
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{
              background: "rgba(0,255,238,0.05)",
              border: "1px solid rgba(0,255,238,0.2)",
            }}
          >
            <p className="font-display font-bold text-cyan-neon text-sm tracking-wide">
              Mint successful!
            </p>
            <p className="text-xs text-chrome-dim/70 font-mono">
              Asset: {short(result.assetAddress)}
            </p>
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-display font-bold text-cyan-neon/80 hover:text-cyan-neon underline underline-offset-4 transition-colors"
            >
              View on Explorer →
            </a>
            <button
              onClick={reset}
              className="text-[11px] font-display font-bold tracking-widest uppercase text-chrome-dim/40 hover:text-chrome-dim transition-colors mt-1"
            >
              Mint another
            </button>
          </div>
        )}

        {/* Error */}
        {status === "error" && error && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: "rgba(255,0,187,0.05)",
              border: "1px solid rgba(255,0,187,0.2)",
            }}
          >
            <p className="font-display font-bold text-magenta-neon text-xs mb-1">
              Mint failed
            </p>
            <p className="text-chrome-dim/60 text-xs leading-relaxed break-words">
              {error}
            </p>
            <button
              onClick={reset}
              className="mt-3 text-[11px] font-display font-bold tracking-widest uppercase text-magenta-neon/60 hover:text-magenta-neon transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <div className="size-6"></div>
      <img
        className="border border-chrome-dim/60 rounded-2xl overflow-hidden w-32 z-50"
        src="https://thesage.cc/badge-big.png"
        alt=""
      />

      {/* Back link */}
      <a
        href="/"
        className="mt-8 text-xs font-display font-bold tracking-widest uppercase text-chrome-dim/30 hover:text-chrome-dim/70 transition-colors"
      >
        ← Back
      </a>
    </div>
  );
}
