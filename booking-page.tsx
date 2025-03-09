"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { DateTime } from "luxon";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useForm } from "react-hook-form";

type Slot = {
  start: string;
  end: string;
  event_id?: string;
};

type CustomerInfo = {
  name: string;
  email: string;
};

type HaircutOption = {
  name: string;
  duration: number;
};

type ApiError = {
  status: number;
  message: string;
};

const API_URL = "https://booking-backend-eight.vercel.app";

// Funkce pro získání fingerprintu
async function getFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
}

export const bookAppointment = async (data: any) => {
  let fingerprint = localStorage.getItem("fingerprint") || "";

  // ✅ Pokud fingerprint není uložený, načteme ho znovu
  if (!fingerprint) {
    fingerprint = await getFingerprint();
    localStorage.setItem("fingerprint", fingerprint);
  }

  const response = await fetch(`${API_URL}/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": process.env.NEXT_PUBLIC_API_SECRET_KEY || "", // Oprava API klíče
      "Fingerprint": fingerprint, // ✅ Fingerprint vždy přítomen
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw { status: response.status, message: errorData.detail || "Chyba při rezervaci" };
  }

  return await response.json();
};

export default function BookingPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerInfo>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<Slot[]>([]);
  const [selectedTime, setSelectedTime] = useState<Slot | null>(null);
  const [haircuts, setHaircuts] = useState<HaircutOption[]>([]);
  const [selectedHaircut, setSelectedHaircut] = useState<HaircutOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [fingerprint, setFingerprint] = useState<string>("");
  const [isFingerprintLoaded, setIsFingerprintLoaded] = useState(false); // ✅ Nový stav

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    email: "",
  });

  // Načtení fingerprintu při prvním renderu
  useEffect(() => {
    getFingerprint().then((fp) => {
      setFingerprint(fp);
      localStorage.setItem("fingerprint", fp); // Uložení fingerprintu do LocalStorage
      setIsFingerprintLoaded(true); // ✅ Nastavení, že fingerprint je načten
    });
  }, []);

  // Funkce pro načtení dostupných termínů
  const fetchSlots = useCallback(async () => {
    if (!fingerprint) return; // ✅ Nevolat request, pokud fingerprint není k dispozici

    try {
      const response = await fetch(`${API_URL}/`, {
        method: "GET",
        headers: {
          "Fingerprint": fingerprint, // ✅ Fingerprint bude vždy dostupný
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log("Načtené termíny z API:", data.terminy);

      // Filtrování termínů od dnešního dne
      const today = DateTime.now().startOf('day');

      const validSlots = data.terminy.filter((slot: Slot) => {
        // Parse date with timezone info preserved
        const slotDate = parseLocalDate(slot.start);
        return slotDate >= today;
      });

      setSlots(validSlots);

      // Resetování výběru, pokud se znovu načítají data
      if (selectedDate) {
        const stillValidDate = validSlots.some(slot => {
          const slotDateStr = parseLocalDate(slot.start).toFormat("yyyy-MM-dd");
          const selectedDateStr = DateTime.fromJSDate(selectedDate).toFormat("yyyy-MM-dd");
          return slotDateStr === selectedDateStr;
        });

        if (!stillValidDate) {
          setSelectedDate(null);
          setSelectedTime(null);
          setAvailableTimes([]);
        } else if (selectedHaircut) {
          // Aktualizace dostupných časů pro vybraný datum a střih
          const times = generateAvailableTimes(selectedHaircut.duration);
          setAvailableTimes(times);

          // Kontrola, zda je vybraný čas stále dostupný
          if (selectedTime) {
            const timeStillAvailable = times.some(time => 
              time.start === selectedTime.start && time.end === selectedTime.end
            );

            if (!timeStillAvailable) {
              setSelectedTime(null);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chyba při načítání termínů:", error);
      setError("Nepodařilo se načíst dostupné termíny. Zkuste to znovu.");
    }
  }, [fingerprint, selectedDate, selectedHaircut, selectedTime]);

  // Načtení termínů až PO načtení fingerprintu
  useEffect(() => {
    if (isFingerprintLoaded) {
      fetchSlots().finally(() => setLoading(false)); // ✅ Bude čekat na načtení fingerprintu
    }
  }, [isFingerprintLoaded, fetchSlots]);

  // Načtení střihů při prvním renderu
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
        console.error("Chyba při načítání střihů:", error);
        setError("Nepodařilo se načíst seznam střihů.");
      }
    }
    fetchHaircuts();
  }, []);
  
  // Pomocná funkce pro parsování lokálního data z ISO řetězce pomocí Luxonu
  const parseLocalDate = (isoString: string): DateTime => {
    // Vytvoření DateTime objektu z ISO stringu s předpokladem, že čas je v pražské časové zóně
    return DateTime.fromISO(isoString, { zone: "Europe/Prague" });
  };
  
  // Získání data bez času (pro porovnání dnů)
  const getDateString = (date: Date): string => {
    return DateTime.fromJSDate(date).toFormat("yyyy-MM-dd");
  };

  // Vytvoření setu dostupných datumů pro kalendář
  const getAvailableDates = useCallback((): Set<string> => {
    const dates = new Set<string>();
    
    slots.forEach(slot => {
      const date = parseLocalDate(slot.start);
      dates.add(date.toFormat("yyyy-MM-dd"));
    });
    
    return dates;
  }, [slots]);

  const availableDates = useMemo(() => getAvailableDates(), [getAvailableDates]);

  const handleDateChange = (date: Date) => {
    // Normalize date to midnight in local timezone using Luxon
    const normalizedDate = DateTime.fromJSDate(date).startOf('day').toJSDate();
    
    const dateString = getDateString(normalizedDate);
    if (!availableDates.has(dateString)) {
      return;
    }
    
    setSelectedDate(normalizedDate);
    setSelectedTime(null);
    setAvailableTimes([]);
    setApiError(null);
    if (selectedHaircut) {
      const times = generateAvailableTimes(selectedHaircut.duration);
      setAvailableTimes(times);
    }
  };

  // Generování dostupných časů na základě délky střihu s využitím Luxonu
  const generateAvailableTimes = useCallback((duration: number): Slot[] => {
    if (!selectedDate) return [];

    // Get the date string in format yyyy-MM-dd
    const selectedDateStr = getDateString(selectedDate);
    
    // Filtrace slotů pro vybraný den
    const daySlots = slots.filter(slot => {
      const slotDate = parseLocalDate(slot.start);
      return slotDate.toFormat("yyyy-MM-dd") === selectedDateStr;
    });

    let available: Slot[] = [];

    daySlots.forEach(slot => {
      let startTime = parseLocalDate(slot.start);
      let endTime = parseLocalDate(slot.end);

      while (startTime.plus({ minutes: duration }) <= endTime) {
        const slotEnd = startTime.plus({ minutes: duration });
        
        available.push({
          start: startTime.toISO() || "",
          end: slotEnd.toISO() || "",
          event_id: slot.event_id
        });

        // Posun o 30 minut
        startTime = startTime.plus({ minutes: 30 });
      }
    });

    // Seřadit dostupné časy
    return available.sort((a, b) => 
      parseLocalDate(a.start).toMillis() - parseLocalDate(b.start).toMillis()
    );
  }, [selectedDate, slots]);

  const handleHaircutChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const haircut = haircuts.find((h) => h.name === event.target.value) || null;
    setSelectedHaircut(haircut);
    setSelectedTime(null);
    setApiError(null);

    if (haircut && selectedDate) {
      const times = generateAvailableTimes(haircut.duration);
      setAvailableTimes(times);
    }
  };

  // Formátování času pro zobrazení v Europe/Prague pomocí Luxonu
  const formatTimeForDisplay = (isoString: string): string => {
    return parseLocalDate(isoString).toFormat("HH:mm");
  };

  // Formátování data pro zobrazení
  const formatDateForDisplay = (date: Date): string => {
    return DateTime.fromJSDate(date).toFormat("dd.MM.yyyy");
  };

  const onSubmit = async (data: CustomerInfo) => {
    if (!selectedHaircut || !selectedTime) {
      alert("Vyplňte všechna pole!");
      return;
    }

    setSubmitting(true);
    setApiError(null);
  
    try {
      // Vytvoření požadavku podle struktury API
      const bookingData = {
        slot: {
          start: selectedTime.start,
          end: selectedTime.end
        },
        customerInfo: {
          name: data.name,
          email: data.email,
          haircut: selectedHaircut.name
        }
      };
  
      console.log("Odesílám rezervaci:", bookingData);
  
      // Odeslání rezervace na API
      const response = await bookAppointment(bookingData);
  
      // ✅ Úspěšná rezervace
      alert(`Rezervace potvrzena na ${formatDateForDisplay(selectedDate!)} v ${formatTimeForDisplay(selectedTime.start)}`);
  
      // ✅ Resetování formuláře
      setSelectedDate(null);
      setSelectedTime(null);
      setSelectedHaircut(null);
      setAvailableTimes([]);
      setCustomerInfo({ name: "", email: "" });
  
      // ✅ Znovu načíst dostupné termíny po úspěšné rezervaci
      await fetchSlots();
      
    } catch (error: any) {
      console.error("Chyba při odesílání rezervace:", error);
  
      // ✅ Nastavení chybové zprávy
      if (error.status === 429) {
        window.location.href = "https://booking-form-snowy.vercel.app/blocked"; // Přesměrování uživatele
      } else {
        setApiError({
          status: 0,
          message: `Chyba: ${error.message || "Nepodařilo se odeslat rezervaci."}`
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Rezervace termínu</h1>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      
      {apiError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Chyba: </strong> {apiError.message}
          {apiError.status === 429 && (
            <p className="mt-1">Příliš mnoho pokusů o rezervaci. Počkejte 1 hodinu a zkuste to znovu.</p>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <section className="mb-6">
          <h2 className="text-xl mb-2">Vyberte datum</h2>
          {selectedDate && (
            <p className="mb-2">Vybrané datum: <strong>{formatDateForDisplay(selectedDate)}</strong></p>
          )}
          <Calendar 
            onChange={handleDateChange} 
            value={selectedDate} 
            tileDisabled={({ date }) => {
              return !availableDates.has(getDateString(date));
            }}
            locale="cs-CZ"
          />
        </section>

        {loading && <p className="text-gray-600 mb-4">Načítání termínů...</p>}

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
            {availableTimes.length > 0 ? (
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
            ) : (
              <p className="text-gray-600">Pro vybraný den a délku střihu nejsou k dispozici žádné termíny.</p>
            )}
          </section>
        )}

        {selectedTime && (
          <>
            <section className="mb-6">
              <h2 className="text-xl mb-2">Vaše jméno</h2>
              <input 
                type="text" 
                className="w-full p-2 border rounded"
                {...register("name", { required: "Zadejte vaše jméno" })}
                placeholder="Zadejte vaše jméno"
              />
              {errors.name && <p className="text-red-500">{errors.name.message}</p>}
            </section>

            <section className="mb-6">
              <h2 className="text-xl mb-2">Váš email</h2>
              <input 
                type="email" 
                className="w-full p-2 border rounded"
                {...register("email", { 
                  required: "Zadejte váš email", 
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Zadejte platný email"
                  }
                })}
                placeholder="Zadejte váš email"
              />
              {errors.email && <p className="text-red-500">{errors.email.message}</p>}
            </section>

            <div className="mt-6 mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold mb-2">Souhrn rezervace:</h3>
              <p><strong>Datum:</strong> {formatDateForDisplay(selectedDate!)}</p>
              <p><strong>Čas:</strong> {formatTimeForDisplay(selectedTime.start)}</p>
              <p><strong>Střih:</strong> {selectedHaircut?.name}</p>
            </div>

            <div className="mt-4">
              <button 
                type="submit" 
                className={`w-full p-3 rounded text-white ${
                  submitting 
                    ? "bg-blue-300 cursor-not-allowed" 
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
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