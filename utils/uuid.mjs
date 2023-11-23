import crypto from "crypto";

const uuid = () => crypto.randomUUID().slice(0, 8);

export default uuid