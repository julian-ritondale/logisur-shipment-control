/**
 * Errors thrown by services. They describe what went wrong, not how to answer
 * it: `ApplicationErrorFilter` maps each kind to Nest's matching HTTP
 * exception, so services stay free of HTTP concerns. Feature errors extend one
 * of the kinds below; a new kind needs a mapping there.
 */
export abstract class ApplicationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** The requested resource does not exist. Answered with 404. */
export class NotFoundError extends ApplicationError {}

/** The input is well-formed as a request but its content can't be used. Answered with 422. */
export class UnprocessableContentError extends ApplicationError {}

/** The request conflicts with the resource's current state. Answered with 409. */
export class ConflictError extends ApplicationError {}
