# ============================
# 1) Etapa de construcción
# ============================
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copiamos el pom y descargamos dependencias (cache importante)
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

# Copiamos el código fuente
COPY src ./src

# Construimos el JAR final
RUN mvn -q -DskipTests clean package


# ============================
# 2) Etapa de ejecución
# ============================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copiar el JAR desde la etapa "build"
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Exponer el puerto donde corre Spring Boot
EXPOSE 8080

# Comando para arrancar la app
ENTRYPOINT ["java", "-jar", "app.jar"]
