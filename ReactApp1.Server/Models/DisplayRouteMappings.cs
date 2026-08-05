using ReactApp1.Server.Dtos;

namespace ReactApp1.Server.Models;

    public static class DisplayRouteMappings
    {
        private static DisplayRouteEntity ToEntity(this DisplayRouteDto dto)
        {
            DisplayRouteEntity entity = new DisplayRouteEntity
            {
                Name = dto.Name,
                Duration = dto.Duration,
                Distance = dto.Distance
            };

        return entity;
        }

        private static DisplayRouteDto ToDto(this DisplayRouteEntity entity)
        {
            DisplayRouteDto dto = new DisplayRouteDto
            {
                Name = entity.Name,
                Duration = entity.Duration,
                Distance = entity.Distance,
            };

            return dto;
        }
    }
