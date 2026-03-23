import { plugin } from '../../src';
import testSchema from './schema';
import threeImplSchema from './threeImplSchema';

it('should support useImplementingTypes and terminateCircularRelationships at the same time', async () => {
    const result = await plugin(testSchema, [], {
        prefix: 'mock',
        useImplementingTypes: true,
        terminateCircularRelationships: true,
    });

    expect(result).toBeDefined();

    expect(result).toContain(
        "events: overrides && overrides.hasOwnProperty('events') ? overrides.events! : [(relationshipsToOmit.has('MeetingEvent') ? {} as MeetingEvent : mockMeetingEvent({}, relationshipsToOmit)) || (relationshipsToOmit.has('OtherEvent') ? {} as OtherEvent : mockOtherEvent({}, relationshipsToOmit))]",
    );

    expect(result).toContain(
        "event: overrides && overrides.hasOwnProperty('event') ? overrides.event! : (relationshipsToOmit.has('MeetingEvent') ? {} as MeetingEvent : mockMeetingEvent({}, relationshipsToOmit)) || (relationshipsToOmit.has('OtherEvent') ? {} as OtherEvent : mockOtherEvent({}, relationshipsToOmit))",
    );

    expect(result).toMatchSnapshot();
});

it('should parenthesize implementing types with 3+ implementations', async () => {
    const result = await plugin(threeImplSchema, [], {
        prefix: 'mock',
        useImplementingTypes: true,
        terminateCircularRelationships: true,
    });

    expect(result).toBeDefined();

    // Each ternary in the || chain must be wrapped in parentheses
    expect(result).toContain(
        "dataItem: overrides && overrides.hasOwnProperty('dataItem') ? overrides.dataItem! : (relationshipsToOmit.has('TypeA') ? {} as TypeA : mockTypeA({}, relationshipsToOmit)) || (relationshipsToOmit.has('TypeB') ? {} as TypeB : mockTypeB({}, relationshipsToOmit)) || (relationshipsToOmit.has('TypeC') ? {} as TypeC : mockTypeC({}, relationshipsToOmit))",
    );

    expect(result).toMatchSnapshot();
});
