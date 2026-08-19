import { HubConnectionBuilder } from '@microsoft/signalr';

/** Whether the SignalR hub is currently delivering updates. */
export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline';

export type OutageHubHandlers = {
    /**
     * The server announced changed data.
     *
     * Also fired after a reconnect: a dropped connection may have missed pushes,
     * so the caller has to re-read rather than trust what it already holds.
     */
    onOutagesChanged: () => void;
    onStateChange: (state: ConnectionState) => void;
};

/**
 * Opens the outage hub and returns a teardown.
 *
 * The only module that knows the transport is SignalR - callers see four
 * connection states and a change notification, nothing vendor-shaped.
 */
export function subscribeToOutageHub({ onOutagesChanged, onStateChange }: OutageHubHandlers): () => void {
    const connection = new HubConnectionBuilder()
        .withUrl("/outageHub")
        .withAutomaticReconnect()
        .build();

    const handleOutagesChanged = () => onOutagesChanged();

    connection.on("OutagesChanged", handleOutagesChanged);

    connection.onreconnecting(() => onStateChange('reconnecting'));

    connection.onreconnected(() => {
        onStateChange('live');
        onOutagesChanged();
    });

    connection.onclose(() => onStateChange('offline'));

    connection
        .start()
        .then(() => onStateChange('live'))
        .catch(error => {
            console.error(error);
            onStateChange('offline');
        });

    return () => {
        connection.off("OutagesChanged", handleOutagesChanged);
        connection.stop().catch(console.error);
    };
}
