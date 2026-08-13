using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Features;
using OutageMap.Server.Infrastructure.Http;

namespace OutageMap.Server.Controllers;

[Route("[controller]")]
[ApiController]
public class OutageMapController : ControllerBase
{
    private readonly IOutageSource _outageService;

    public OutageMapController(IOutageSource outageService)
    {
        _outageService = outageService;
    }

    [HttpGet("OutageData")]
    public async Task<ActionResult> GetOutageData()
    {
        //var outageDto = await _outageService.GetOutageData();

        //var outageGeoJson = ConvertToFeatureCollection(outageDto);

        return Ok(new FeatureCollection());
    }

}
