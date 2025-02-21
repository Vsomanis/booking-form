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
        const response = await fetch("https://booking-backend-dj8twkyre-vsomanis-projects.vercel.app/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
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
        setError("Failed to load available slots. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, []);

  const availableDates = slots.map((slot) => slot.start.split("T")[0]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    if (!date) return;

    const times = slots.filter((slot) => slot.start.startsWith(date.toISOString().split("T")[0]));
    setAvailableTimes(times);
    setSelectedTime(times.length > 0 ? times[0] : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) return;

    if (!customerInfo.name || !customerInfo.email || !customerInfo.haircut) {
      setError("Please fill in all fields");
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
        throw new Error("Booking failed");
      }

      setSelectedDate(null);
      setSelectedTime(null);
      setCustomerInfo({ name: "", email: "", haircut: "" });
      alert("Booking successful!");
    } catch (error) {
      console.error("Error booking slot:", error);
      setError("Failed to book appointment. Please try again.");
    }
  };

  if (loading) return <p className="text-center p-4">Loading available slots...</p>;
  if (error) return <p className="text-center text-red-500 p-4">{error}</p>;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Book Appointment</h1>

      <form onSubmit={handleSubmit}>
        <section className="mb-6">
          <h2 className="text-xl mb-2">Select Date</h2>
          <Calendar
            onChange={handleDateChange}
            value={selectedDate}
            tileDisabled={({ date }) => !availableDates.includes(date.toISOString().split("T")[0])}
            className="w-full"
          />
        </section>

        {selectedDate && (
          <section className="mb-6">
            <h2 className="text-xl mb-2">Select Time</h2>
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
            <h2 className="text-xl mb-2">Your Information</h2>
            <input
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              type="text"
              placeholder="Name"
              required
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
            />
            <input
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              type="email"
              placeholder="Email"
              required
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
            />
            <input
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              type="text"
              placeholder="Haircut Type"
              required
              value={customerInfo.haircut}
              onChange={(e) => setCustomerInfo({ ...customerInfo, haircut: e.target.value })}
            />
            <button
              type="submit"
              className="w-full p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Book Appointment
            </button>
          </section>
        )}
      </form>
    </div>
  );
}
