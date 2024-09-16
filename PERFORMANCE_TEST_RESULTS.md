# Performance test results

Test computer specs:
  - Windows 11 Education
  - CPU: AMD Ryzen R7 5700X3D
  - RAM: 16GB


### GET main page for 5 seconds with 10 concurrent users

http_reqs: 5412
http_req_duration - median: 8.88ms
http_req_duration - 99th percentile: 13.02ms


### GET course page for 5 seconds with 10 concurrent users

http_reqs: 4573
http_req_duration - median: 10.71ms
http_req_duration - 99th percentile: 14.3ms


### GET /api/questions/cs-e4770/1 for 5 seconds with 10 concurrent users

http_reqs: 26839
http_req_duration - median: 1.78ms
http_req_duration - 99th percentile: 2.85ms


### POST /api/questions/cs-e4770 for 5 seconds with 10 concurrent users (one question per minute limit turned off)

http_reqs: 5520
http_req_duration - median: 7.26ms
http_req_duration - 99th percentile: 19.76ms


### POST /api/answers for 5 seconds with 10 concurrent users (one answer per minute limit turned off)

http_reqs: 2109
http_req_duration - median: 14.72ms
http_req_duration - 99th percentile: 93.11ms