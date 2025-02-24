"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type Slot = {
  start: string;
  end: string;
};

type CustomerInfo = {
  name: string;
  email: string;
  haircut: string;
};

export default function BookingPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<Slot[]>([]);
  const [selectedTime, setSelectedTime] = useState<Slot | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    email: "",
    haircut: "",
  });

  useEffect(() => {
    async function fetchSlots() {
      try {
        const response = await fetch("https://booking-backend-eight.vercel.app/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          mode: "cors",
        });

        if (!response.ok) {
          throw new Error("Nepodařilo se načíst volné termíny.");
        }

        const data = await response.json();
        console.log("Načtená data z backendu:", data);
        setSlots(data.terminy || []);
      } catch (error) {
        console.error("Chyba při načítání termínů:", error);
        setError("Nepodařilo se načíst dostupné termíny. Zkuste to znovu.");
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, []);

  const availableDates = new Set(slots.map((slot) => slot.start.split("T")[0]));

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    if (!date) return;

    const times = slots.filter((slot) => slot.start.startsWith(date.toISOString().split("T")[0]));
    setAvailableTimes(times);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) {
      setError("Vyberte čas.");
      return;
    }

    if (!customerInfo.name || !customerInfo.email || !customerInfo.haircut) {
      setError("Vyplňte všechna pole.");
      return;
    }

    try {
      const response = await fetch("https://booking-backend-eight.vercel.app/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slot: selectedTime,
          customerInfo,
        }),
      });

      if (!response.ok) {
        throw new Error("Rezervace se nezdařila.");
      }

      setSelectedDate(null);
      setSelectedTime(null);
      setCustomerInfo({ name: "", email: "", haircut: "" });
      alert("Rezervace úspěšná!");
    } catch (error) {
      console.error("Chyba při rezervaci:", error);
      setError("Nepodařilo se vytvořit rezervaci. Zkuste to znovu.");
    }
  };

  if (loading) return <p className="text-center p-4">Načítání dostupných termínů...</p>;
  if (error) return <p className="text-center text-red-500 p-4">{error}</p>;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Rezervace termínu</h1>

      <form onSubmit={handleSubmit}>
        <section className="mb-6">
          <h2 className="text-xl mb-2">Vyberte datum</h2>
          <Calendar
            onChange={handleDateChange}
            value={selectedDate}
            tileDisabled={({ date }) => !availableDates.has(date.toISOString().split("T")[0])}
            className="w-full"
          />
        </section>

        {selectedDate && (
          <section className="mb-6">
            <h2 className="text-xl mb-2">Vyberte čas</h2>
            <div className="flex flex-wrap gap-2">
              {availableTimes.map((slot) => (
                <button
                  type="button"
                  key={slot.start}
                  className={`px-4 py-2 rounded transition-colors ${
                    selectedTime?.start === slot.start
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                  onClick={() => setSelectedTime(slot)}
                >
                  {new Date(slot.start).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {new Date(slot.end).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </button>
              ))}
            </div>
          </section>
        )}

        {selectedTime && (
          <section className="space-y-4">
            <h2 className="text-xl mb-2">O Vás</h2>
            <input className="w-full p-2 border rounded" type="text" placeholder="Jméno" required />
            <input className="w-full p-2 border rounded" type="email" placeholder="E-mail" required />
            <input className="w-full p-2 border rounded" type="text" placeholder="Typ střihu" required />
            <button type="submit" className="w-full p-2 bg-primary text-white rounded">
              Potvrdit rezervaci
            </button>
          </section>
        )}
      </form>
    </div>
  );
}
