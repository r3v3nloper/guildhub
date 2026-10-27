/** An expected failure whose message is written for the user and may be shown as is. */
export class DomainError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class ForbiddenError extends DomainError {
  public constructor(reason: string) {
    super(reason);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends DomainError {
  public constructor(what: string) {
    super(`${what} nicht gefunden.`);
    this.name = "NotFoundError";
  }
}
