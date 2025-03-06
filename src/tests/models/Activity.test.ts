import {AccessGroup, ActivityType, TaskScheduleType} from "~/common/enum/enumerations"
import {User} from "~/db/sql/models/User";
import {randomName, relativeDate} from "~/tests/utils";
import {Activity} from "~/db/sql/models/Activity";
import {Tenet} from "~/db/sql/models/Tenet";

async function prepareSchedule(dates: [Date, Date][]) {
    const tenet = new Tenet(undefined, {
        name: randomName('Test Tenet'),
    });

    const user = new User(undefined, {
        firstName: 'Test',
        lastName: 'User',
        email: randomName('test') + '@reliablesecurities.com',
        password: 'password',
        type: AccessGroup.CLIENT,
    })

    tenet.users = [user]
    await tenet.commit()

    user.activities = [
        ...dates.map(([start, end]) => new Activity(undefined, {
            title: 'Test Activity',
            type: ActivityType.SCHEDULED,
            taskScheduleType: TaskScheduleType.MEETING,
            assignedById: user.guid,
            tenetId: tenet.guid,
            startDate: start, // Same day, 8 AM
            endDate: end, // Same day, 8:30 AM
        })),
    ]

    await user.commit()

    return {
        tenet,
        user
    }
}

describe('Activity Tests', () => {
    describe('AI Functions', () => {
        describe('Check activity availability', () => {
            test('Basic availability check for one day', async () => {
                const {tenet, user} = await prepareSchedule([
                    [relativeDate(0, 8), relativeDate(0, 8, 30)],
                    [relativeDate(0, 12), relativeDate(0, 2 + 12, 30)],
                    [relativeDate(0, 4 + 12), relativeDate(0, 5 + 12, 30)]
                ])

                // Availability should be from 7:30-8:00, 8:30 - 12, and from 2:30-4
                const currentDate = new Date()
                const availabilityTestString = `${currentDate.toLocaleDateString('default', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short',
                    timeZone: 'UTC' // The UTC time is offset to the user's timezone so we need to display as UTC as that's artificially set to the user's timezone
                })}: 7:30AM-8AM, 8:30AM-12PM, and 2:30PM-4PM`

                const tzOffset = new Date().getTimezoneOffset()

                const availability = await Activity.checkScheduleAvailability(relativeDate(0, 0, 0), relativeDate(0, 23, 59), undefined, {
                    user,
                    tenetId: tenet.guid,
                    tzOffset
                })

                expect(availability).toBe(availabilityTestString)
            })

            test('Check activity availability with duration', async () => {
                const {tenet, user} = await prepareSchedule([
                    [relativeDate(0, 8), relativeDate(0, 8, 30)],
                    [relativeDate(0, 12), relativeDate(0, 2 + 12, 30)],
                    [relativeDate(0, 4 + 12), relativeDate(0, 5 + 12, 30)]
                ])

                // Availability should be from 8:30 - 12, and from 2:30-4
                const currentDate = new Date()

                const availabilityTestString = `${currentDate.toLocaleDateString('default', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short',
                    timeZone: 'UTC' // The UTC time is offset to the user's timezone so we need to display as UTC as that's artificially set to the user's timezone
                })}: 8:30AM-12PM and 2:30PM-4PM`

                const tzOffset = new Date().getTimezoneOffset()

                const availability = await Activity.checkScheduleAvailability(relativeDate(0, 0, 0), relativeDate(0, 23, 59), 60, {
                    user,
                    tenetId: tenet.guid,
                    tzOffset
                })

                expect(availability).toBe(availabilityTestString)
            })

            test('Check activity availability over multiple days', async () => {
                const {tenet, user} = await prepareSchedule([
                    [relativeDate(0, 8), relativeDate(0, 8, 30)],
                    [relativeDate(0, 12), relativeDate(0, 2 + 12, 30)],
                    [relativeDate(0, 4 + 12), relativeDate(0, 5 + 12, 30)],
                    [relativeDate(1, 7, 30), relativeDate(1, 9, 30)],
                    [relativeDate(1, 12), relativeDate(1, 2 + 12, 30)],
                    [relativeDate(1, 4 + 12), relativeDate(1, 5 + 12)]
                ])

                // Availability should be from 7:30-8:00, 8:30 - 12, and from 2:30-4 on the first day
                // Availability should be from 9:30-12:00, 2:30 - 4, and from 5-5:30 on the second day

                const currentDate = new Date()
                const tomorrow = relativeDate(1, 0, 0)
                const availabilityTestString = `${currentDate.toLocaleDateString('default', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short',
                    timeZone: 'UTC' // The UTC time is offset to the user's timezone so we need to display as UTC as that's artificially set to the user's timezone
                })}: 7:30AM-8AM, 8:30AM-12PM, and 2:30PM-4PM\n${tomorrow.toLocaleDateString('default', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short',
                    timeZone: 'UTC' // The UTC time is offset to the user's timezone so we need to display as UTC as that's artificially set to the user's timezone
                })}: 9:30AM-12PM, 2:30PM-4PM, and 5PM-5:30PM`

                const tzOffset = new Date().getTimezoneOffset()

                const availability = await Activity.checkScheduleAvailability(relativeDate(0, 0, 0), relativeDate(1, 23, 59), undefined, {
                    user,
                    tenetId: tenet.guid,
                    tzOffset
                })

                expect(availability).toBe(availabilityTestString)

                const availabilityWithDurationTestString = `${currentDate.toLocaleDateString('default', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short',
                    timeZone: 'UTC' // The UTC time is offset to the user's timezone so we need to display as UTC as that's artificially set to the user's timezone
                })}: 8:30AM-12PM and 2:30PM-4PM\n${tomorrow.toLocaleDateString('default', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short',
                    timeZone: 'UTC' // The UTC time is offset to the user's timezone so we need to display as UTC as that's artificially set to the user's timezone
                })}: 9:30AM-12PM and 2:30PM-4PM`

                const availabilityWithDuration = await Activity.checkScheduleAvailability(relativeDate(0, 0, 0), relativeDate(1, 23, 59), 60, {
                    user,
                    tenetId: tenet.guid,
                    tzOffset
                })

                expect(availabilityWithDuration).toBe(availabilityWithDurationTestString)
            })

            test('Check activity availability with times out of normal business hours', async () => {
                const {tenet, user} = await prepareSchedule([
                    [relativeDate(0, 6), relativeDate(0, 8, 30)],
                    [relativeDate(0, 12), relativeDate(0, 2 + 12, 30)],
                    [relativeDate(0, 4 + 12), relativeDate(0, 5 + 12)],
                    [relativeDate(0, 6 + 12), relativeDate(0, 8 + 12)],
                    [relativeDate(1, 6, 30), relativeDate(1, 7, 30)],
                    [relativeDate(1, 8, 30), relativeDate(1, 9, 30)],
                    [relativeDate(1, 12), relativeDate(1, 2 + 12, 30)],
                    [relativeDate(1, 4 + 12), relativeDate(1, 7 + 12)]
                ])

                // Availability should be from 8:30-12, 2:30-4, and 5-5:30 on the first day
                // Availability should be from 7:30-8:30, 9:30 - 12, and from 2:30-4 on the second day

                const currentDate = new Date()
                const tomorrow = relativeDate(1, 0, 0)
                const availabilityTestString = `${currentDate.toLocaleDateString('default', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short',
                    timeZone: 'UTC' // The UTC time is offset to the user's timezone so we need to display as UTC as that's artificially set to the user's timezone
                })}: 8:30AM-12PM, 2:30PM-4PM, and 5PM-5:30PM\n${tomorrow.toLocaleDateString('default', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short',
                    timeZone: 'UTC' // The UTC time is offset to the user's timezone so we need to display as UTC as that's artificially set to the user's timezone
                })}: 7:30AM-8:30AM, 9:30AM-12PM, and 2:30PM-4PM`

                const tzOffset = new Date().getTimezoneOffset()

                const availability = await Activity.checkScheduleAvailability(relativeDate(0, 0, 0), relativeDate(1, 23, 59), undefined, {
                    user,
                    tenetId: tenet.guid,
                    tzOffset
                })

                expect(availability).toBe(availabilityTestString)

                const availabilityWithDurationTestString = `${currentDate.toLocaleDateString('default', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short',
                    timeZone: 'UTC' // The UTC time is offset to the user's timezone so we need to display as UTC as that's artificially set to the user's timezone
                })}: 8:30AM-12PM and 2:30PM-4PM\n${tomorrow.toLocaleDateString('default', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short',
                    timeZone: 'UTC' // The UTC time is offset to the user's timezone so we need to display as UTC as that's artificially set to the user's timezone
                })}: 9:30AM-12PM and 2:30PM-4PM`

                const availabilityWithDuration = await Activity.checkScheduleAvailability(relativeDate(0, 0, 0), relativeDate(1, 23, 59), 90, {
                    user,
                    tenetId: tenet.guid,
                    tzOffset
                })

                expect(availabilityWithDuration).toBe(availabilityWithDurationTestString)
            })

            test('Check no availability', async () => {
                const {tenet, user} = await prepareSchedule([
                    [relativeDate(0, 7, 30), relativeDate(0, 5 + 12, 30)],
                    [relativeDate(0, 12), relativeDate(0, 2 + 12, 30)],
                    [relativeDate(1, 7, 30), relativeDate(1, 3 + 12, 30)],
                ])

                // No availability on the first day
                // Availability should be from 3 - 5:30 on the second day

                const tomorrow = relativeDate(1, 0, 0)
                const availabilityTestString = `${tomorrow.toLocaleDateString('default', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short',
                    timeZone: 'UTC' // The UTC time is offset to the user's timezone so we need to display as UTC as that's artificially set to the user's timezone
                })}: 3:30PM-5:30PM`

                const tzOffset = new Date().getTimezoneOffset()

                const availability = await Activity.checkScheduleAvailability(relativeDate(0, 0, 0), relativeDate(1, 23, 59), undefined, {
                    user,
                    tenetId: tenet.guid,
                    tzOffset
                })

                expect(availability).toBe(availabilityTestString)

                const availabilityWithDurationTestString = `No availability`

                const availabilityWithDuration = await Activity.checkScheduleAvailability(relativeDate(0, 0, 0), relativeDate(1, 23, 59), 180, {
                    user,
                    tenetId: tenet.guid,
                    tzOffset
                })

                expect(availabilityWithDuration).toBe(availabilityWithDurationTestString)
            })
        })
    })
})