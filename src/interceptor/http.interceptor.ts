import { AxiosInstance } from "axios";


const setInterceptor = (axios: AxiosInstance) => {
    // Add a request interceptor
    axios.interceptors.request.use(function (config) {
        if (config.url !== '/auth/login' && localStorage.getItem('auth_token')) {
            config.headers.setAuthorization(`Bearer ${localStorage.getItem('auth_token')}`)
        }
        return config;
    }, function (error) {
        return Promise.reject(error);
    });


    // Add a response interceptor
    // axios.interceptors.response.use(function (response) {
    //     return response.data;
    // }, function (error) {
    //     return Promise.reject(error);
    // });

}


export {
    setInterceptor
}