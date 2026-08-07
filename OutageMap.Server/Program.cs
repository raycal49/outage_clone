using Microsoft.EntityFrameworkCore;
using NetTopologySuite.IO.Converters;
using OutageMap.Server.Infrastructure.Http;
using OutageMap.Server.Infrastructure.Persistence;
using System.Text.Json.Serialization;

var opts = new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
    WebRootPath = "wwwroot"
};
var builder = WebApplication.CreateBuilder(opts);

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new GeoJsonConverterFactory());
    o.JsonSerializerOptions.NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals;
    o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.CustomSchemaIds(type => type.FullName!
        .Replace("+", ".")
        .Replace("`", "_"));
});

var connString = builder.Configuration.GetConnectionString("DefaultConnection")
                 ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(connString, o =>
    {
        o.UseNetTopologySuite();
        o.EnableRetryOnFailure();
    });

    if (builder.Environment.IsDevelopment())
    {
        options.EnableDetailedErrors();
        options.EnableSensitiveDataLogging();
        options.LogTo(Console.WriteLine);
    }
});


if (builder.Configuration.GetValue<bool>("Outages:UseFixture"))
{
    builder.Services.AddSingleton<IOutageService, FixtureOutageService>();
}
else builder.Services.AddHttpClient<IOutageService,OutageService>(client =>
{
    client.BaseAddress = new Uri("https://centerpoint.datacapable.com/datacapable/v2/p/centerpoint/r/texas/map/events");
});

string connectionString = builder.Configuration.GetConnectionString("Redis");

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = connectionString;
});


var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.DisplayRequestDuration();
    });

    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
