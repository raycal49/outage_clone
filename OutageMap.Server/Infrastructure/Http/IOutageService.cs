using OutageMap.Server.Dtos;

namespace OutageMap.Server.Infrastructure.Http
{
    public interface IOutageService
    {
        Task<List<OutageDataDto>> GetOutageData();
    }
}