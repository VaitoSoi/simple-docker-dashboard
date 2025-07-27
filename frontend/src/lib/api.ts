import axios from "axios";

export default axios.create({
    baseURL: process.env.SDD_BACKEND_URL || "http://localhost:8000",
});