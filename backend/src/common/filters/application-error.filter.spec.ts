import { ArgumentsHost, HttpServer, Logger } from '@nestjs/common';
import {
  ApplicationError,
  ConflictError,
  NotFoundError,
  UnprocessableContentError,
} from '../errors/application.errors.js';
import { ApplicationErrorFilter } from './application-error.filter.js';

class WidgetNotFoundError extends NotFoundError {}
class InvalidWidgetError extends UnprocessableContentError {}
class WidgetBusyError extends ConflictError {}
class UnmappedError extends ApplicationError {}

describe('ApplicationErrorFilter', () => {
  const response = {};
  let reply: ReturnType<typeof vi.fn>;
  let filter: ApplicationErrorFilter;
  let host: ArgumentsHost;

  beforeEach(() => {
    reply = vi.fn();
    const adapter = {
      reply,
      isHeadersSent: () => false,
      end: vi.fn(),
    } as unknown as HttpServer;
    filter = new ApplicationErrorFilter(adapter);
    host = {
      getArgByIndex: (index: number) => (index === 1 ? response : undefined),
    } as unknown as ArgumentsHost;
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Scenario: application errors are answered with their HTTP status and Nest’s standard body', () => {
    it.each([
      [new WidgetNotFoundError('Widget 1 not found'), 404, 'Not Found'],
      [new InvalidWidgetError('Widget is broken'), 422, 'Unprocessable Entity'],
      [new WidgetBusyError('Widget is busy'), 409, 'Conflict'],
    ])(
      'Given %s, when it is handled, then the answer is %i %s with its message',
      (error, statusCode, name) => {
        filter.catch(error, host);
        expect(reply).toHaveBeenCalledWith(
          response,
          { statusCode, error: name, message: error.message },
          statusCode,
        );
      },
    );
  });

  describe('Scenario: an application error kind with no mapping', () => {
    it('Given an ApplicationError of a kind with no mapping, when it is handled, then the answer is a 500 that does not leak its message', () => {
      filter.catch(new UnmappedError('internal detail'), host);
      expect(reply).toHaveBeenCalledWith(
        response,
        { statusCode: 500, message: 'Internal server error' },
        500,
      );
    });
  });
});
