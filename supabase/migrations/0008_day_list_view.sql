-- Aggregated day list for the journey map (day → theme + word count).
create view day_list as
select day, max(theme) as theme, count(*)::int as words
from words
where day is not null
group by day;
