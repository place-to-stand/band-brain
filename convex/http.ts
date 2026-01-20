import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Mount auth routes
auth.addHttpRoutes(http);

export default http;
