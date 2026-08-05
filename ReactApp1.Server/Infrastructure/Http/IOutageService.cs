using ReactApp1.Server.Dtos;

namespace ReactApp1.Server.Infrastructure.Http
{
    public interface IOutageService
    {
        Task<List<OutageDataDto>> GetOutageData();
    }
}