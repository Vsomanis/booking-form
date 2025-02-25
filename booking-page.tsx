"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

// Typy pro rezervace
type Slot = {
  start: string;
  end: string;
};

type CustomerInfo = {
  name: string;
  email: string;
  haircut: string;
};

type HaircutOption = {
  name: string;
  duration: number;
};

export default function BookingPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<Slot[]>([]);
  const [selectedTime, setSelectedTime] = useState<Slot | null>(null);
  const [haircuts, setHaircuts] = useState<HaircutOption[]>([]);
  const [selectedHaircut, setSelectedHaircut] = useState<HaircutOption | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    email: "",
    haircut: "",
  });

  // Načítání dostupných termínů
  useEffect(() => {
    async function fetchSlots() {
      try {
        const response = await fetch("https://booking-backend-eight.vercel.app/");
        if (!response.ok) {
          throw new Error("Nepodařilo se načíst volné termíny.");
        }
        const data = await response.json();
        setSlots(data.terminy || []);
      } catch (error) {
        setError("Nepodařilo se načíst dostupné termíny. Zkuste to znovu.");
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, []);

  // Načítání seznamu střihů
  useEffect(() => {
    async function fetchHaircuts() {
      try {
        const response = await fetch("/haircuts.json");
        if (!response.ok) {
          throw new Error("Nepodařilo se načíst střihy.");
        }
        const data = await response.json();
        setHaircuts(data);
      } catch (error) {
        setError("Nepodařilo se načíst seznam střihů.");
      }
    }
    fetchHaircuts();
  }, []);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setAvailableTimes([]);
  };

  const handleHaircutChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const haircut = haircuts.find((h) => h.name === event.target.value) || null;
    setSelectedHaircut(haircut);

    if (haircut && selectedDate) {
      const times = generateAvailableTimes(haircut.duration);
      setAvailableTimes(times);
    }
  };

  const generateAvailableTimes = (duration: number): Slot[] => {
    if (!selectedDate) return [];

    const dateStr = selectedDate.toISOString().split("T")[0];
    const daySlots = slots.filter((slot) => slot.start.startsWith(dateStr));
    let available: Slot[] = [];

    daySlots.forEach((slot) => {
      let startTime = new Date(slot.start);
      let endTime = new Date(slot.end);

      while (startTime.getTime() + duration * 60000 <= endTime.getTime()) {
        const slotEnd = new Date(startTime.getTime() + duration * 60000);
        available.push({ start: startTime.toISOString(), end: slotEnd.toISOString() });
        startTime = new Date(slotEnd);
      }
    });

    return available;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime || !selectedHaircut || !customerInfo.name || !customerInfo.email) {
      setError("Vyplňte všechna pole.");
      return;
    }

    try {
      const response = await fetch("https://booking-backend-eight.vercel.app/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: selectedTime, customerInfo }),
      });

      if (!response.ok) {
        throw new Error("Rezervace se nezdařila.");
      }

      alert("Rezervace úspěšná!");
    } catch (error) {
      setError("Nepodařilo se vytvořit rezervaci. Zkuste to znovu.");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Rezervace termínu</h1>
      <form onSubmit={handleSubmit}>
        <section className="mb-6">
          <h2 className="text-xl mb-2">Vyberte datum</h2>
          <Calendar onChange={handleDateChange} value={selectedDate} />
        </section>

        {selectedDate && (
          <section className="mb-6">
            <h2 className="text-xl mb-2">Vyberte střih</h2>
            <select className="w-full p-2 border rounded" onChange={handleHaircutChange}>
              <option value="">Vyberte střih</option>
              {haircuts.map((haircut) => (
                <option key={haircut.name} value={haircut.name}>{haircut.name}</option>
              ))}
            </select>
          </section>
        )}

        {selectedHaircut && availableTimes.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xl mb-2">Vyberte čas</h2>
            <select className="w-full p-2 border rounded" onChange={(e) => setSelectedTime(JSON.parse(e.target.value))}>
              <option value="">Vyberte čas</option>
              {availableTimes.map((slot) => (
                <option key={slot.start} value={JSON.stringify(slot)}>
                  {new Date(slot.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </option>
              ))}
            </select>
          </section>
        )}

        {selectedTime && (
          <section className="space-y-4">
            <h2 className="text-xl mb-2">O Vás</h2>
            <input className="w-full p-2 border rounded" type="text" placeholder="Jméno" required />
            <input className="w-full p-2 border rounded" type="email" placeholder="E-mail" required />
            <button type="submit" className="w-full p-2 bg-primary text-white rounded">Potvrdit rezervaci</button>
          </section>
        )}
      </form>
    </div>
  );
}
