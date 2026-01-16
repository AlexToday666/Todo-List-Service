FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

#Кеширование зависимостей
COPY pom.xml .
RUN mvn -q -e -DskipTests dependency:go-offline

# Копируем исходники и собираем jar
COPY src ./src
RUN mvn -q -DskipTests package

# Run Stage
FROM eclipse-temurin:17-jre
WORKDIR /app

# Копирование jara
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]