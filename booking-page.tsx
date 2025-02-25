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
  });

  useEffect(() => {
    async function fetchSlots() {
      try {
        const response = await fetch("https://booking-backend-eight.vercel.app/");
        if (!response.ok) {
          throw new Error("Nepodařilo se načíst volné termíny.");
        }
        const data = await response.json();
        const today = new Date().toISOString().split("T")[0];
        const validSlots = data.terminy.filter((slot: Slot) => {
          const slotDate = new Date(slot.start).toISOString().split("T")[0];
          return slotDate >= today;
        });
        setSlots(validSlots);
      } catch (error) {
        setError("Nepodařilo se načíst dostupné termíny. Zkuste to znovu.");
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, []);

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

  const availableDates = new Set(
    slots.map((slot) => new Date(slot.start).toISOString().split("T")[0])
  );

  const handleDateChange = (date: Date) => {
    const dateString = date.toISOString().split("T")[0];
    if (!availableDates.has(dateString)) {
      return;
    }
    setSelectedDate(date);
    setSelectedTime(null);
    setAvailableTimes([]);
  };

  const generateAvailableTimes = (duration: number): Slot[] => {
    if (!selectedDate) return [];

    const dateStr = selectedDate.toISOString().split("T")[0];
    const daySlots = slots.filter(slot => slot.start.split("T")[0] === dateStr);

    let available: Slot[] = [];

    daySlots.forEach(slot => {
      let startTime = new Date(slot.start);
      let endTime = new Date(slot.end);

      while (startTime.getTime() + duration * 60000 <= endTime.getTime()) {
        const slotEnd = new Date(startTime.getTime() + duration * 60000);
        available.push({
          start: startTime.toISOString(),
          end: slotEnd.toISOString(),
        });

        startTime = new Date(startTime.getTime() + 30 * 60000); // Posun o 30 min
      }
    });

    return available;
  };

  const handleHaircutChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const haircut = haircuts.find((h) => h.name === event.target.value) || null;
    setSelectedHaircut(haircut);

    if (haircut && selectedDate) {
      const times = generateAvailableTimes(haircut.duration);
      setAvailableTimes(times);
    }
  };

  const handleReservation = () => {
    if (!customerInfo.name || !customerInfo.email || !selectedHaircut || !selectedTime) {
      alert("Vyplňte všechna pole!");
      return;
    }

    // Odeslat rezervaci (můžeš upravit API endpoint)
    console.log("📅 Rezervace odeslána:", {
      jméno: customerInfo.name,
      email: customerInfo.email,
      střih: selectedHaircut.name,
      čas: selectedTime.start,
    });

    alert(`Rezervace potvrzena na ${new Date(selectedTime.start).toLocaleTimeString("cs-CZ")}`);
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Rezervace termínu</h1>
      <form>
        <section className="mb-6">
          <h2 className="text-xl mb-2">Vyberte datum</h2>
          <Calendar 
            onChange={handleDateChange} 
            value={selectedDate} 
            tileDisabled={({ date }) => {
              const dateString = date.toISOString().split("T")[0];
              return !availableDates.has(dateString);
            }}
          />
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
            <h2 className="text-xl mb-2">Vyberte čas příchodu</h2>
            <select className="w-full p-2 border rounded" onChange={(e) => {
              const selectedSlot = availableTimes.find(slot => slot.start === e.target.value) || null;
              setSelectedTime(selectedSlot);
            }}>
              <option value="">Vyberte čas příchodu</option>
              {availableTimes.map((slot) => (
                <option key={slot.start} value={slot.start}>
                  {new Date(slot.start).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                </option>
              ))}
            </select>
          </section>
        )}

        {selectedTime && (
          <>
            <section className="mb-6">
              <h2 className="text-xl mb-2">Vaše jméno</h2>
              <input 
                type="text" 
                className="w-full p-2 border rounded"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              />
            </section>

            <section className="mb-6">
              <h2 className="text-xl mb-2">Váš email</h2>
              <input 
                type="email" 
                className="w-full p-2 border rounded"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
              />
            </section>

            <button 
              type="button" 
              className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
              onClick={handleReservation}
            >
              Zarezervovat
            </button>
          </>
        )}
      </form>
    </div>
  );
}
