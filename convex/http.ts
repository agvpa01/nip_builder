import { auth } from "./auth";
import { httpRouter } from "convex/server";

const http = httpRouter();

auth.addHttpRoutes(http);

// Removed storage-backed NIP serving route.

export default http;
