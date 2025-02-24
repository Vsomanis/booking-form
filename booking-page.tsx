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
  const [specificTime, setSpecificTime] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    email: "",
    haircut: "",
  });

  useEffect(() => {
    async function fetchSlots() {
      try {
        const response = await fetch("https://booking-backend-eight.vercel.app/");
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

  const availableDates = slots.map((slot) => slot.start.split("T")[0]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setSpecificTime(null);
    if (!date) return;
    const times = slots.filter((slot) => slot.start.startsWith(date.toISOString().split("T")[0]));
    setAvailableTimes(times);
  };

  const generateTimeSlots = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const timeSlots = [];

    while (startTime < endTime) {
      const nextTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutové bloky
      if (nextTime > endTime) break;

      timeSlots.push({
        label: `${startTime.toLocaleTimeString("cs-CZ", {
          hour: "2-digit",
          minute: "2-digit",
        })} - ${nextTime.toLocaleTimeString("cs-CZ", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        value: startTime.toISOString(),
      });
      startTime.setMinutes(startTime.getMinutes() + 30);
    }
    return timeSlots;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime || !specificTime) return;

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
          slot: { start: specificTime, end: new Date(new Date(specificTime).getTime() + 30 * 60 * 1000).toISOString() },
          customerInfo,
        }),
      });

      if (!response.ok) {
        throw new Error("Rezervace se nezdařila.");
      }

      setSelectedDate(null);
      setSelectedTime(null);
      setSpecificTime(null);
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
          <Calendar onChange={handleDateChange} value={selectedDate} className="w-full" />
        </section>

        {selectedDate && (
          <section className="mb-6">
            <h2 className="text-xl mb-2">Vyberte čas</h2>
            <select className="w-full p-2 border rounded" onChange={(e) => setSelectedTime(JSON.parse(e.target.value))}>
              <option value="">Vyberte dostupný čas</option>
              {availableTimes.map((slot) => (
                <option key={slot.start} value={JSON.stringify(slot)}>
                  {new Date(slot.start).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })} - {new Date(slot.end).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                </option>
              ))}
            </select>
          </section>
        )}

        {selectedTime && (
          <section className="mb-6">
            <h2 className="text-xl mb-2">Vyberte konkrétní čas</h2>
            <select className="w-full p-2 border rounded" onChange={(e) => setSpecificTime(e.target.value)}>
              <option value="">Vyberte čas</option>
              {generateTimeSlots(selectedTime.start, selectedTime.end).map((slot) => (
                <option key={slot.value} value={slot.value}>{slot.label}</option>
              ))}
            </select>
          </section>
        )}

        {specificTime && (
          <section className="space-y-4">
            <h2 className="text-xl mb-2">O Vás</h2>
            <input className="w-full p-2 border rounded" type="text" placeholder="Jméno" required />
            <input className="w-full p-2 border rounded" type="email" placeholder="E-mail" required />
            <input className="w-full p-2 border rounded" type="text" placeholder="Typ střihu" required />
            <button type="submit" className="w-full p-2 bg-primary text-white rounded">Potvrdit rezervaci</button>
          </section>
        )}
      </form>
    </div>
  );
}
