---
layout: page
permalink: /talks/
title: talks
description: Invited talks, department-wide seminar presentations, lectures, and reading group presentations
years: [2022, 2021, 2020, 2019]
nav: true
nav_order: 5
---
<!-- _pages/publications.md -->
<div class="publications">
    {%- for y in page.years %}
    <h2 class="year">{{y}}</h2>
    {% bibliography -f talks -q @*[year={{y}}]* %}
    {% endfor %}

</div>
