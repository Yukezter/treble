import { Server } from "./server";
import identityAuth from "./middleware/identityAuth";
import { enrollHandler, checkInHandler } from "./enrollment";
import { mdmHandler } from "./mdm";
import {
  pushCertHandler,
  pushHandler,
  enrollmentsHandler,
  devicesHandler,
  usersHandler,
} from "./api";

enum ENDPOINTS {
  // Public
  INDEX = "/",
  ENROLL = "/enroll",
  SCEP = "/scep", // TODO
  // MDM
  CHECK_IN = "/mdm/checkin",
  MDM = "/mdm/connect",
  // API
  API_PUSH_CERT = "/api/pushcert",
  API_PUSH = "/api/push/:id",
  API_ENQUEUE = "/api/enqueue",
  API_ENROLLMENTS = "/api/enrollments", // TODO
  API_DEVICES = "/api/devices", // TODO
  API_USERS = "/api/users", // TODO
}

const port = process.env.PORT;
const server = new Server();

server.get(ENDPOINTS.ENROLL, enrollHandler);
server.put(ENDPOINTS.CHECK_IN, identityAuth, checkInHandler);
server.put(ENDPOINTS.MDM, identityAuth, mdmHandler);
server.get(ENDPOINTS.API_PUSH, pushHandler);
server.post(ENDPOINTS.API_PUSH_CERT, pushCertHandler);
// TODO: api handlers for enrollments, devices, and users
server.post(ENDPOINTS.API_PUSH_CERT, enrollmentsHandler);
server.post(ENDPOINTS.API_PUSH_CERT, devicesHandler);
server.post(ENDPOINTS.API_PUSH_CERT, usersHandler);

server.listen(port);
