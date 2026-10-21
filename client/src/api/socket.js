import { io } from "socket.io-client";
import { tokenStore } from "./http";

export const socket = io({
  auth: (cb) => cb({ token: tokenStore.get() }),
});