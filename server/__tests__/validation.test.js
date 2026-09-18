const { z } = require('zod');

const messageSchema = z.object({
  room: z.string().min(1).max(50),
  msg: z.string().min(1).max(1000),
});

describe('message schema validation', () => {
  test('accepts a valid message', () => {
    const result = messageSchema.safeParse({ room: 'general', msg: 'hello!' });
    expect(result.success).toBe(true);
  });

  test('rejects empty message', () => {
    const result = messageSchema.safeParse({ room: 'general', msg: '' });
    expect(result.success).toBe(false);
  });

  test('rejects message over 1000 chars', () => {
    const result = messageSchema.safeParse({ room: 'general', msg: 'a'.repeat(1001) });
    expect(result.success).toBe(false);
  });
});