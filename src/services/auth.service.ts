import http from "./http.service";

const login = async (username: string, password: string) => {
    try {
        const response = await http.post<{ access_token: string }>('/auth/login', { username, password });
        if (response.data.access_token) {
            localStorage.setItem('auth_token', response.data.access_token);
        }
        return;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export {
    login
}