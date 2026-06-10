import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 20000,
});

export async function getProducts() {
  const response = await api.get("/products");
  return response.data;
}

export async function getRecommendations(query) {
  const response = await api.post("/recommend", { query });
  return response.data;
}
