import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Cancel() {
  const router = useRouter();
  const { event_id, email } = router.query;
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!event_id || !email) {
      setStatus("invalid");
      return;
    }

    const cancelReservation = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/cancel`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_id, email }),
          }
        );

        if (response.ok) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("Chyba při rušení rezervace:", error);
        setStatus("error");
      }
    };

    cancelReservation();
  }, [event_id, email]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      {status === "loading" && <p>⏳ Probíhá rušení rezervace...</p>}
      {status === "success" && (
        <div>
          <h1 className="text-2xl font-bold text-red-600">Rezervace zrušena</h1>
          <p className="mt-2">Tvoje rezervace byla úspěšně zrušena.</p>
          <a
            href="/"
            className="mt-4 inline-block bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Zpět na rezervaci
          </a>
        </div>
      )}
      {status === "error" && (
        <p className="text-red-600">❌ Nepodařilo se zrušit rezervaci.</p>
      )}
      {status === "invalid" && (
        <p className="text-red-600">⚠️ Neplatný odkaz pro zrušení rezervace.</p>
      )}
    </div>
  );
}
