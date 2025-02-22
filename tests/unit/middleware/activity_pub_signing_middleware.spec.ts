import { validateDate } from '#middleware/activty_pub_signing_middleware'
import { test } from '@japa/runner'

test.group('validateDate', () => {
  test('should throw an error for an empty string ', async ({ assert }) => {
    // GIVEN
    const dateHeader = ''
    const currentDate = new Date('2025-02-22T22:09Z')

    // WHEN
    const result = validateDate({
      dateHeader,
      currentDate,
    })

    // THEN
    assert.deepEqual(result, {
      ok: false,
      message: `Date Header Could Not Be Parsed`,
    })
  })

  // TODO we should have more unit tests here
})
