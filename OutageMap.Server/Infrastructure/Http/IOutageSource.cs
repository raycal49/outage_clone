using OutageMap.Server.Dtos;

namespace OutageMap.Server.Infrastructure.Http;

    public interface IOutageSource
    {
        Task<List<OutageDto>> GetOutageData();
    }
