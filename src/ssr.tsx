import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { startInstance } from "./start";
import "./styles.css";

export { startInstance };

export default createStartHandler(defaultStreamHandler);
