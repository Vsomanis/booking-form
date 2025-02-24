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
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [availableEndTimes, setAvailableEndTimes] = useState<string[]>([]);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);
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
          headers: { "Content-Type": "application/json" },
          mode: "cors",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch slots");
        }

        const data = await response.json();
        console.log("Loaded data from backend:", data);
        setSlots(data.terminy || []);
      } catch (error) {
        console.error("Error fetching slots:", error);
        setError("Nepodařilo se načíst volné termíny. Zkuste to znovu.");
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, []);

  const availableDates = [...new Set(slots.map((slot) => slot.start.split("T")[0]))];

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
    if (!date) return;

    const times = slots
      .filter((slot) => slot.start.startsWith(date.toISOString().split("T")[0]))
      .map((slot) => ({
        start: new Date(slot.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        end: new Date(slot.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }));

    setAvailableTimes(times);
  };

  const handleStartTimeChange = (startTime: string) => {
    setSelectedStartTime(startTime);
    setSelectedEndTime(null);

    const possibleEndTimes = availableTimes
      .filter((slot) => slot.start >= startTime)
      .map((slot) => slot.end);

    setAvailableEndTimes(possibleEndTimes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStartTime || !selectedEndTime) return;

    if (!customerInfo.name || !customerInfo.email || !customerInfo.haircut) {
      setError("Vyplňte prosím všechna pole");
      return;
    }

    try {
      const response = await fetch("https://booking-backend-eight.vercel.app/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot: { start: selectedStartTime, end: selectedEndTime },
          customerInfo,
        }),
      });

      if (!response.ok) {
        throw new Error("Rezervace selhala");
      }

      setSelectedDate(null);
      setSelectedStartTime(null);
      setSelectedEndTime(null);
      setCustomerInfo({ name: "", email: "", haircut: "" });
      alert("Rezervace byla úspěšná!");
    } catch (error) {
      console.error("Chyba při rezervaci:", error);
      setError("Nepodařilo se provést rezervaci. Zkuste to znovu.");
    }
  };

  if (loading) return <p className="text-center p-4">Načítám volné termíny...</p>;
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
            tileDisabled={({ date }) => !availableDates.includes(date.toISOString().split("T")[0])}
            className="w-full"
          />
        </section>

        {selectedDate && (
          <section className="mb-6">
            <h2 className="text-xl mb-2">Vyberte čas</h2>
            <select
              value={selectedStartTime || ""}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="" disabled>Vyberte čas</option>
              {availableTimes.map((slot) => (
                <option key={slot.start} value={slot.start}>
                  {slot.start} - {slot.end}
                </option>
              ))}
            </select>
          </section>
        )}

        {selectedStartTime && (
          <section className="mb-6">
            <h2 className="text-xl mb-2">Vyberte konkrétní čas</h2>
            <select
              value={selectedEndTime || ""}
              onChange={(e) => setSelectedEndTime(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="" disabled>Vyberte ukončení</option>
              {availableEndTimes.map((endTime) => (
                <option key={endTime} value={endTime}>
                  {selectedStartTime} - {endTime}
                </option>
              ))}
            </select>
          </section>
        )}

        {selectedEndTime && (
          <section className="space-y-4">
            <h2 className="text-xl mb-2">O Vás</h2>
            <input
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              type="text"
              placeholder="Jméno"
              required
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
            />
            <input
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              type="email"
              placeholder="E-mail"
              required
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
            />
            <input
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              type="text"
              placeholder="Typ střihu"
              required
              value={customerInfo.haircut}
              onChange={(e) => setCustomerInfo({ ...customerInfo, haircut: e.target.value })}
            />
            <button type="submit" className="w-full p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
              Potvrdit rezervaci
            </button>
          </section>
        )}
      </form>
    </div>
  );
}
