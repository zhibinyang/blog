---
title: "{{ replace .TranslationBaseName "-" " " | title }}"
subtitle: ""
date: {{ .Date }}
slug: "{{ .File.Dir | split "/" | last 1 }}"
description: ""
keywords: ""
comment: false
---
