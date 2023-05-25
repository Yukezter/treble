import { Server, ENDPOINTS } from "./server";
import { extractIdentity } from "./middleware/extractIdentity";
import { verifyIdentitySigner } from "./middleware/verifyIdentitySigner";
import { enrollHandler, checkInHandler } from "./enrollment";
import { mdmHandler } from "./mdm";
import {
  pushCertHandler,
  pushHandler,
  enrollmentsHandler,
  devicesHandler,
  usersHandler,
} from "./api";

const port = process.env.PORT;
const server = new Server();

server.use("/mdm", extractIdentity, verifyIdentitySigner);

server.get(ENDPOINTS.ENROLL, enrollHandler);
server.put(ENDPOINTS.CHECK_IN, checkInHandler);
server.put(ENDPOINTS.MDM, mdmHandler);
server.get(ENDPOINTS.API_PUSH, pushHandler);
server.post(ENDPOINTS.API_PUSH_CERT, pushCertHandler);
// TODO: api handlers for enrollments, devices, and users
server.post(ENDPOINTS.API_PUSH_CERT, enrollmentsHandler);
server.post(ENDPOINTS.API_PUSH_CERT, devicesHandler);
server.post(ENDPOINTS.API_PUSH_CERT, usersHandler);

server.listen(port);
