export class HttpError extends Error {
  status: number;

  constructor(status: number, message?: string | undefined) {
    super(message);
    this.status = status;
  }
}

export class NotFound extends HttpError {
  constructor(message = "Not Found") {
    super(404, message);
  }
}

export class InternalServerError extends HttpError {
  constructor(message = "Internal Server Error") {
    super(405, message);
  }
}

export class MethodNotAllowed extends HttpError {
  constructor(message = "Method Not Allowed") {
    super(405, message);
  }
}

export class BadRequest extends HttpError {
  constructor(message = "Bad Request") {
    super(400, message);
  }
}

export class Gone extends HttpError {
  constructor(message = "Gone") {
    super(410, message);
  }
}

export class Forbidden extends HttpError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}
