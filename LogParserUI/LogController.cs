using Braspag.FluentQueryBuilder;
using LogQuery = Interop.MSUtil.LogQueryClassClass;
using IISW3CInputFormat = Interop.MSUtil.COMIISW3CInputContextClassClass;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Collections;
using System.Text.Json;
using System.IO;
using System.Runtime.InteropServices;

namespace LogParserUI
{
    [Route("api/[controller]")]
    [ApiController]
    public class LogController : ControllerBase
    {
        private readonly IConfiguration _config;

        public LogController(IConfiguration config)
        {
            _config = config;
        }

        [HttpGet]
        public IActionResult Get(int limit, int year, int? month, int? day, 
            [FromQuery(Name="filters")] List<Dictionary<string, string>> filters, 
            [FromQuery(Name="order[]")] string[] order)
        {
            var path = _config.GetValue<string>("LogPath");
            var file = String.Format("u_ex{0}{1}{2}.log", year % 100, month?.ToString("00") ?? "??", day?.ToString("00") ?? "??");

            if (Directory.GetFiles(path, file).Length == 0)
                return BadRequest("No log files");

            var sb = new SelectBuilder()
              .Select($"TOP {limit} *")
              .From(Path.Combine(path, file))
              .Where("1 = 1");

            foreach (var dict in filters)
            {
                var value = "'" + (dict["condition"].Contains("LIKE") ? "%" + dict["value"] + "%" : dict["value"]) + "'";
                sb.And(String.Concat(dict["field"], " ", dict["condition"], " ", value));
            }

            sb.OrderBy(order);

            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                return Ok(GetData(sb.Build()));
            else
                return StatusCode(StatusCodes.Status501NotImplemented);
        }

        private ArrayList GetData(string query)
        {
            var data = new ArrayList();

            try
            {
                var oLogQuery = new LogQuery();
                var oIISW3CInputFormat = new IISW3CInputFormat();
                var oRecordSet = oLogQuery.Execute(query, oIISW3CInputFormat);

                for (; !oRecordSet.atEnd(); oRecordSet.moveNext())
                {
                    var oRecord = oRecordSet.getRecord();

                    var row = new Dictionary<string, object>();
                    for (int i = 0; i < oRecordSet.getColumnCount(); i++)
                    {
                        if (!oRecord.isNull(i))
                            row.Add(oRecordSet.getColumnName(i), oRecordSet.getColumnType(i) == oRecordSet.TIMESTAMP_TYPE ? oRecord.toNativeString(i) : oRecord.getValue(i));
                    }
                    data.Add(row);
                }

                oRecordSet.close();
            }
            catch (COMException ex)
            {
                Console.WriteLine("Unexpected error: " + ex.Message);
            }

            return data;
        }
    }
}
