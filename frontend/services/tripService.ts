const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"

export async function getTrips() {
  const res = await fetch(`${API_URL}/trips`)
  return res.json()
}

export async function getTrip(id: number) {
  const res = await fetch(`${API_URL}/trips/${id}`)
  return res.json()
}

export async function generateTrip(data: {
  destination: string
  days: number
  budget: number
  travel_style: string
}) {
  const res = await fetch(`${API_URL}/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}
