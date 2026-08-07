using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using OutageMap.Server.Infrastructure.Http;

using static OutageMap.Server.Models.GeoJsonConversions;

namespace OutageMap.Server.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class OutageMapController : ControllerBase
    {
        private readonly IOutageService _outageService;

        public OutageMapController(IOutageService outageService)
        {
            _outageService = outageService;
        }

        [HttpGet("OutageData")]
        public async Task<ActionResult> GetOutageData()
        {
            var outageDto = await _outageService.GetOutageData();

            var outageGeoJson = ConvertToFeatureCollection(outageDto);

            return Ok(outageGeoJson);
        }

    }
}
