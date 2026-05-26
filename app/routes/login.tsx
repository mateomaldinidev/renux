import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { login } from "../server/functions/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDigit = (d: string) => {
    if (pin.length < 6) setPin((p) => p + d);
  };

  const handleDelete = () => setPin((p) => p.slice(0, -1));

  const handleSubmit = async () => {
    if (pin.length === 0) return;
    setLoading(true);
    setError("");
    try {
      await login({ data: { pin } });
      router.navigate({ to: "/" });
    } catch {
      setError("PIN incorrecto");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Enter") {
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, loading]);

  return (
    <div className="min-h-screen bg-[#FFF5F0] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-[#F57A28] tracking-tight">
            RENUX
          </h1>
          <p className="text-sm text-gray-400 mt-1">Sistema de gestiÃ³n interno</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-orange-100">
          <p className="text-center font-semibold text-gray-700 mb-6">
            IngresÃ¡ tu PIN
          </p>

          <div className="flex justify-center gap-3 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all ${
                  i < pin.length
                    ? error
                      ? "bg-red-500"
                      : "bg-[#F57A28]"
                    : "border-2 border-gray-200"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto mb-6">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className="bg-[#FFF5F0] rounded-lg py-4 text-xl font-bold text-gray-800 hover:bg-orange-100 transition-colors"
              >
                {d}
              </button>
            ))}
            <div />
            <button
              onClick={() => handleDigit("0")}
              className="bg-[#FFF5F0] rounded-lg py-4 text-xl font-bold text-gray-800 hover:bg-orange-100 transition-colors"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-50 rounded-lg py-4 text-lg text-red-400 hover:bg-red-100 transition-colors"
            >
              âŒ«
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || pin.length === 0}
            className="w-full bg-[#F57A28] text-white font-bold py-3 rounded-lg hover:bg-[#D4601A] transition-colors disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Ingresar â†’"}
          </button>
        </div>
      </div>
    </div>
  );
}
