import { plugin } from '../../src';
import testSchema from './schema';

it('should support useImplementingTypes and terminateCircularRelationships at the same time', async () => {
    const result = await plugin(testSchema, [], {
        prefix: 'mock',
        useImplementingTypes: true,
        terminateCircularRelationships: true,
    });

    expect(result).toBeDefined();

    expect(result).toContain(
        "events: overrides && overrides.hasOwnProperty('events') ? overrides.events! : [relationshipsToOmit.has('MeetingEvent') ? {} as MeetingEvent : mockMeetingEvent({}, relationshipsToOmit) || relationshipsToOmit.has('OtherEvent') ? {} as OtherEvent : mockOtherEvent({}, relationshipsToOmit)]",
    );

    expect(result).toContain(
        "event: overrides && overrides.hasOwnProperty('event') ? overrides.event! : relationshipsToOmit.has('MeetingEvent') ? {} as MeetingEvent : mockMeetingEvent({}, relationshipsToOmit) || relationshipsToOmit.has('OtherEvent') ? {} as OtherEvent : mockOtherEvent({}, relationshipsToOmit)",
    );

    expect(result).toMatchSnapshot();
});
