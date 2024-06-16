import axios from "axios";
import { setInterceptor } from "../interceptor/http.interceptor";

const http = axios.create({
    baseURL: process.env.REACT_APP_API_URL
})

setInterceptor(http);

export default http;