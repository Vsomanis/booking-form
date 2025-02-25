"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type Slot = {
  start: string;
  end: string;
  event_id?: string; // Přidáno pro identifikaci v API
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
  const [submitting, setSubmitting] = useState(false);

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    email: "",
  });

  // API adresa pro backend
  const API_URL = "https://booking-backend-eight.vercel.app";

  useEffect(() => {
    async function fetchSlots() {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/`);
        if (!response.ok) {
          throw new Error("Nepodařilo se načíst volné termíny.");
        }
        const data = await response.json();
        
        // Filtrování termínů od dnešního dne
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const validSlots = data.terminy.filter((slot: Slot) => {
          const slotDate = new Date(slot.start);
          return slotDate >= today;
        });
        
        setSlots(validSlots);
      } catch (error) {
        setError("Nepodařilo se načíst dostupné termíny. Zkuste to znovu.");
        console.error("Chyba při načítání termínů:", error);
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
        console.error("Chyba při načítání střihů:", error);
      }
    }
    fetchHaircuts();
  }, []);

  // Vytvoření setu dostupných datumů pro kalendář
  const availableDates = new Set(
    slots.map((slot) => {
      const date = new Date(slot.start);
      return date.toISOString().split("T")[0];
    })
  );

  const handleDateChange = (date: Date) => {
    // Normalizace data bez času
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    const dateString = normalizedDate.toISOString().split("T")[0];
    if (!availableDates.has(dateString)) {
      return;
    }
    
    setSelectedDate(normalizedDate);
    setSelectedTime(null);
    setAvailableTimes([]);
  };

  // Generování dostupných časů na základě délky střihu
  const generateAvailableTimes = (duration: number): Slot[] => {
    if (!selectedDate) return [];

    // Formátování data pro porovnání
    const dateStr = selectedDate.toISOString().split("T")[0];
    
    // Filtrace slotů pro vybraný den
    const daySlots = slots.filter(slot => {
      const slotDate = new Date(slot.start).toISOString().split("T")[0];
      return slotDate === dateStr;
    });

    let available: Slot[] = [];

    daySlots.forEach(slot => {
      let startTime = new Date(slot.start);
      let endTime = new Date(slot.end);

      while (startTime.getTime() + duration * 60000 <= endTime.getTime()) {
        const slotEnd = new Date(startTime.getTime() + duration * 60000);
        
        available.push({
          start: startTime.toISOString(),
          end: slotEnd.toISOString(),
          event_id: slot.event_id  // Přidání ID události pro API
        });

        // Posun o 30 minut
        startTime = new Date(startTime.getTime() + 30 * 60000);
      }
    });

    // Seřadit dostupné časy
    return available.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  };

  const handleHaircutChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const haircut = haircuts.find((h) => h.name === event.target.value) || null;
    setSelectedHaircut(haircut);
    setSelectedTime(null);

    if (haircut && selectedDate) {
      const times = generateAvailableTimes(haircut.duration);
      setAvailableTimes(times);
    }
  };

  // Formátování času pro zobrazení v Europe/Prague
  const formatTimeForDisplay = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Prague"
    });
  };

  // Formátování data pro zobrazení
  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const handleReservation = async () => {
    if (!customerInfo.name || !customerInfo.email || !selectedHaircut || !selectedTime) {
      alert("Vyplňte všechna pole!");
      return;
    }

    // Kontrola emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerInfo.email)) {
      alert("Zadejte platný email!");
      return;
    }

    setSubmitting(true);

    try {
      // Vytvoření požadavku podle struktury API
      const bookingData = {
        slot: {
          start: selectedTime.start,
          end: selectedTime.end
        },
        customerInfo: {
          name: customerInfo.name,
          email: customerInfo.email,
          haircut: selectedHaircut.name
        }
      };

      // Odeslání rezervace na API
      const response = await fetch(`${API_URL}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Nepodařilo se odeslat rezervaci.");
      }

      // Úspěšná rezervace
      const result = await response.json();
      
      alert(`Rezervace potvrzena na ${formatDateForDisplay(new Date(selectedTime.start))} v ${formatTimeForDisplay(selectedTime.start)}`);
      
      // Resetování formuláře
      setSelectedDate(null);
      setSelectedTime(null);
      setSelectedHaircut(null);
      setAvailableTimes([]);
      setCustomerInfo({ name: "", email: "" });
      
      // Znovu načíst dostupné termíny
      fetchSlots();
      
    } catch (error) {
      console.error("Chyba při odesílání rezervace:", error);
      alert(`Chyba: ${error instanceof Error ? error.message : "Nepodařilo se odeslat rezervaci."}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Rezervace termínu</h1>
      
      {loading && <p className="text-gray-600 mb-4">Načítání termínů...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      
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
            <select 
              className="w-full p-2 border rounded" 
              onChange={handleHaircutChange}
              value={selectedHaircut?.name || ""}
            >
              <option value="">Vyberte střih</option>
              {haircuts.map((haircut) => (
                <option key={haircut.name} value={haircut.name}>
                  {haircut.name} ({haircut.duration} min)
                </option>
              ))}
            </select>
          </section>
        )}

        {selectedHaircut && availableTimes.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xl mb-2">Vyberte čas příchodu</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {availableTimes.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  className={`p-2 border rounded ${
                    selectedTime && selectedTime.start === slot.start
                      ? "bg-blue-500 text-white"
                      : "bg-white hover:bg-gray-100"
                  }`}
                  onClick={() => setSelectedTime(slot)}
                >
                  {formatTimeForDisplay(slot.start)}
                </button>
              ))}
            </div>
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
                placeholder="Zadejte vaše jméno"
                required
              />
            </section>

            <section className="mb-6">
              <h2 className="text-xl mb-2">Váš email</h2>
              <input 
                type="email" 
                className="w-full p-2 border rounded"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                placeholder="Zadejte váš email"
                required
              />
            </section>

            <div className="mt-4">
              <button 
                type="button" 
                className={`w-full p-3 rounded text-white ${
                  submitting 
                    ? "bg-blue-300 cursor-not-allowed" 
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
                onClick={handleReservation}
                disabled={submitting}
              >
                {submitting ? "Odesílání..." : "Zarezervovat"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}