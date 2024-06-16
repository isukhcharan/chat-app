import axios from "axios";
import { User } from "../interface/user.interface";

export class UserService {
  user!: User;

  async getUser(socketId: string) {
    try {
      const response = await axios.get(`http://localhost:3001/users/${socketId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }
}