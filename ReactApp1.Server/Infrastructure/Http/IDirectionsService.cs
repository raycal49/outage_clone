using ReactApp1.Server.Dtos;

namespace ReactApp1.Server.Infrastructure.Http
{
    public interface IDirectionsService
    {
        Task<DirectionsResponseDto> GetDirections(string coordinates);
    }
}