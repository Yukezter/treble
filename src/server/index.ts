import http from "http";
import crypto from "crypto";
import { HttpError, NotFound } from "./errors";

// server code I reused from another project

type Methods = {
  GET: "GET";
  POST: "POST";
  PUT: "PUT";
  PATCH: "PATCH";
  DELETE: "DELETE";
};

class Route {
  private segments: string[];

  route: string;
  params: IncomingMessage["params"] = {};
  handlers: Handler[];

  constructor(route: string, handlers: Handler[]) {
    this.route = route;
    this.segments = this.route.split("/");
    this.handlers = handlers.map<Handler>((handler) => {
      return async (req, res) => {
        req.params = this.params;
        await handler(req, res);
        req.params = {};
      };
    });
  }

  matches(psegments: string[]) {
    if (this.route[0] === "*") {
      return true;
    }

    if (psegments.length < this.segments.length) {
      return false;
    }

    const params: IncomingMessage["params"] = {};

    for (let i = 0; i < psegments.length; i++) {
      if (this.segments[i] === undefined) {
        break;
      }

      if (this.segments[i][0] === ":") {
        params[this.segments[i].slice(1)] = psegments[i];
        continue;
      }

      if (psegments[i] !== this.segments[i]) {
        return false;
      }
    }

    this.params = params;
    return true;
  }
}

export class IncomingMessage extends http.IncomingMessage {
  path: string = "/";
  segments: string[] = [];
  query: { [prop: string]: string } = {};
  params: { [prop: string]: string } = {};
  certificate?: crypto.X509Certificate;

  private chunks?: Buffer;

  setup() {
    const url = new URL(this.url || "/", `http://${this.headers.host}`);
    this.path = url.pathname;
    this.segments = this.path.split("/");
    this.query = Object.fromEntries(url.searchParams);

    console.log(this.method, this.path);
  }

  body() {
    return new Promise<Buffer>((resolve, reject) => {
      if (!this.chunks) {
        const chunks: Buffer[] = [];

        this.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        this.on("end", () => {
          this.chunks = Buffer.concat(chunks);
          resolve(this.chunks);
        });

        this.on("error", (err) => {
          reject(err);
        });
      } else {
        resolve(this.chunks);
      }
    });
  }
}

export class ServerResponse<
  Request extends http.IncomingMessage = IncomingMessage
> extends http.ServerResponse<Request> {
  status(code: number) {
    this.statusCode = code;
    return this;
  }

  send(data?: any) {
    this.status(200).end(data);
  }

  json(data: Record<string, any> = {}) {
    this.setHeader("Content-Type", "application/json");
    this.status(200).end(JSON.stringify(data));
  }
}

export class Server {
  private server: http.Server;

  private middleware: {
    global: Handler[];
    routes: Route[];
  } = {
    global: [] as Handler[],
    routes: [],
  };

  // private handlers = new Map<string, { [m in keyof Methods]: Handler[] }>();
  routes: {
    GET: Route[];
    POST: Route[];
    PUT: Route[];
    PATCH: Route[];
    DELETE: Route[];
  } = {
    GET: [],
    POST: [],
    PUT: [],
    PATCH: [],
    DELETE: [],
  };

  constructor(opts: http.ServerOptions = {}) {
    const _opts = { ...opts, IncomingMessage, ServerResponse };

    this.server = http.createServer(_opts, async (req, res) => {
      try {
        req.setup();

        // All matching handlers will go here
        const handlers = [...this.middleware.global];

        // Add all eligible middleware handlers
        for (let middleware of this.middleware.routes) {
          if (middleware.matches(req.segments)) {
            handlers.push(...middleware.handlers);
          }
        }

        // Add the main route/method handler(s)
        for (let route of this.routes[req.method as keyof Methods]) {
          if (route.matches(req.segments)) {
            handlers.push(...route.handlers);
          }
        }

        handlers.push(() => {
          throw new NotFound();
        });

        // Run all the handlers
        for (let handler of handlers) {
          await handler(req, res);

          // Exit loop after a handler calls res.end()
          if (res.writableEnded) {
            break;
          }
        }
      } catch (err) {
        if (err instanceof HttpError) {
          console.log(err.message);
          res.status(err.status).end(err.message);
        } else {
          console.log(err);
          res.status(500).end();
        }
      }
    });
  }

  private validate(route: string) {
    if (typeof route !== "string") {
      throw new Error("Route must be a string");
    }
    const regex = /^(\/[^\r\n\/]{1,}){1,}$/g;
    if (route !== "*" && !regex.test(route)) {
      throw new Error(`Invalid route: ${route}`);
    }
  }

  private add(...args: [string, keyof Methods, ...Handler[]] | [string | Handler, ...Handler[]]) {
    if (typeof args[0] === "string") {
      const route = args[0];
      this.validate(route);

      if (typeof args[1] === "string") {
        const method = args[1];
        const handlers = args.slice(2) as Handler[];
        this.routes[method].push(new Route(route, handlers));
      } else {
        const handlers = args.slice(1) as Handler[];
        this.middleware.routes.push(new Route(route, handlers));
      }
    } else {
      this.middleware.global.push(...(args as Handler[]));
    }
  }

  use(route: string | Handler, ...handlers: Handler[]) {
    this.add(route, ...handlers);
  }

  get(route: string, ...handlers: Handler[]) {
    this.add(route, "GET", ...handlers);
  }

  post(route: string, ...handlers: Handler[]) {
    this.add(route, "POST", ...handlers);
  }

  put(route: string, ...handlers: Handler[]) {
    this.add(route, "PUT", ...handlers);
  }

  patch(route: string, ...handlers: Handler[]) {
    this.add(route, "PATCH", ...handlers);
  }

  delete(route: string, ...handlers: Handler[]) {
    this.add(route, "DELETE", ...handlers);
  }

  all(route: string, ...handlers: Handler[]) {
    this.get(route, ...handlers);
    this.post(route, ...handlers);
    this.put(route, ...handlers);
    this.patch(route, ...handlers);
    this.delete(route, ...handlers);
  }

  listen(port: string | number = 8080, cb?: () => void) {
    const callback = cb || (() => console.log(`Server running on port ${port}`));
    this.server.listen(port, callback);
  }
}
