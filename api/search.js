import handler from "./server.js";

export default async function (req, res) {
  return await handler(req, res);
}
