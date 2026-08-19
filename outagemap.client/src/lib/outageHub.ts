import { HubConnectionBuilder } from '@microsoft/signalr';

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline';

export type OutageHubHandlers = {
    onOutagesChanged: () => void;
    onStateChange: (state: ConnectionState) => void;
};

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
